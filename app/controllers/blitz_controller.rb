# frozen_string_literal: true

# Tidy blitz: pick 5-20 minutes and choose the chores (or take a suggestion),
# then race the clock. Optional, no penalty for stopping early.
class BlitzController < ApplicationController
  OPTIONS = [ 5, 10, 15, 20 ].freeze
  CHOICE_LIMIT = 40

  def show
    minutes = params[:minutes].to_i
    minutes = 10 unless OPTIONS.include?(minutes)
    today = Current.user.today
    available = Current.user.tasks.available_on(today).order(:duration_minutes, :id).includes(:assignee, :user).limit(60).to_a
    render inertia: "blitz/Show", props: {
      minutes: minutes,
      options: OPTIONS,
      choices: available.first(CHOICE_LIMIT).map { |t| TaskPresenter.new(t, today: today).as_json },
      suggested: line_up(available, minutes).map(&:id),
      treat: Current.user.treat,
      bonus: { min: Game::Economy.blitz_min_cleared, **Game::Economy.blitz_bonus(1) },
      playlists: Game::Catalog.playlists.map { |p| p.slice("key", "label", "blurb", "spotify_id").symbolize_keys }
    }
  end

  # Completes one chore from the blitz. Reports with a plain notice rather than
  # the victory dialog so the sprint is not interrupted; badges still count.
  def complete
    task = Current.user.tasks.find(params[:id])
    completion = task.complete!(today: Current.user.today)
    Achievements::Evaluator.call(Current.user) if completion&.reward&.awarded
    if completion
      reward = completion.reward
      notice = reward&.awarded ? "Done! +#{reward.xp} XP, +#{reward.coins} coins." : "Done!"
      surprise = Game::Surprise.after_win(user: Current.user, completion: completion) if reward&.awarded
      notice = "#{notice} #{surprise.summary}" if surprise
      notice = "#{notice} #{boss_notice(completion.boss_results)}" if completion.boss_results.present?
      flash[:notice] = notice
    end
    redirect_to blitz_path(minutes: params[:minutes])
  end

  # Ends a sprint. Finishing at least a few chores inside the window pays a
  # bonus per chore, once per sprint (keyed by its last completion).
  def finish
    minutes = OPTIONS.include?(params[:minutes].to_i) ? params[:minutes].to_i : 10
    recent = Current.user.completions.active.where(completed_at: since(minutes)..).order(:completed_at).to_a
    if recent.size >= Game::Economy.blitz_min_cleared
      bonus = Game::Economy.blitz_bonus(recent.size)
      award = Game::AwardOneOff.call(user: Current.user, kind: "blitz", reference: "blitz:#{recent.last.id}",
                                     xp: bonus[:xp], coins: bonus[:coins])
      flash[:notice] = "Blitz bonus! #{recent.size} chores cleared: +#{award.xp} XP and +#{award.coins} coins." if award.awarded
    end
    redirect_to blitz_path(minutes: minutes)
  end

  private
    # When the sprint began: the browser's start time if it is plausible (within
    # the last three hours), otherwise just the sprint length ago.
    def since(minutes)
      started = Time.zone.at(params[:started_at].to_i / 1000.0)
      params[:started_at].present? && started > 3.hours.ago && started <= Time.current ? started : (minutes + 2).minutes.ago
    end

    # A suggestion: shortest first until the time budget is used (always at
    # least one). The player can ignore it and choose their own.
    def line_up(available, minutes)
      budget = minutes
      available.each_with_object([]) do |task, out|
        next if task.duration_minutes > budget && out.any?
        next if task.duration_minutes > minutes

        out << task
        budget -= task.duration_minutes
        break out if budget <= 0 || out.size >= 12
      end
    end

    def boss_notice(results)
      results.map { |battle, result| result.defeated ? "#{battle.title} defeated!" : "Boss stage cleared." }.join(" ")
    end
end
