# frozen_string_literal: true

class TasksController < ApplicationController
  before_action :set_task, only: %i[update destroy complete uncomplete skip defer start tiny_steps split]

  def create
    task = Current.user.tasks.build(task_params)

    if task.save
      redirect_back fallback_location: quests_path, notice: "Quest added."
    else
      redirect_back_with_errors(task)
    end
  end

  def update
    if @task.update(task_params)
      redirect_back fallback_location: quests_path
    else
      redirect_back_with_errors(@task)
    end
  end

  # Tasks with history are archived so completions and (later) reward
  # transactions are preserved; tasks never completed are deleted outright.
  def destroy
    @task.completions.exists? ? @task.archive! : @task.destroy
    redirect_back fallback_location: quests_path
  end

  def complete
    completion = @task.complete!(today: Current.user.today)
    if completion&.reward&.awarded
      surprise = Game::Surprise.after_win(user: Current.user, completion: completion)
      flash[:victory] = victory_payload(completion, Achievements::Evaluator.call(Current.user), surprise)
    end
    flash[:notice] = boss_notice(completion.boss_results) if completion&.boss_results.present?
    redirect_back fallback_location: quests_path
  end

  # Beginning counts: a small one-off XP award the first time a task is started
  # each day (the "just 2 minutes" button). Called with a raw fetch(), not
  # Inertia's router, so it returns JSON and sets no flash that a following
  # redirect could swallow.
  def start
    user = Current.user
    result = Game::AwardOneOff.call(user: user, kind: "start", reference: "#{@task.id}:#{user.today.iso8601}",
                                    xp: Game::Economy.start_xp)
    render json: { awarded: result.awarded, xp: result.xp }
  end

  # Called with a raw fetch() from the focus timer, so JSON is right here.
  def tiny_steps
    render json: { steps: Quests::TinySteps.call(@task) }
  end

  # Replaces a stuck one-off with a few tiny quests stacked as a boss battle.
  def split
    result = Tasks::Split.call(@task)
    if result
      redirect_to boss_battle_path(result.battle), notice: "Split into #{result.tasks.size} tiny quests, stacked as a boss battle. One small piece at a time."
    else
      redirect_back fallback_location: quests_path, alert: "That one can't be split (repeating chores and quests in a battle stay as they are)."
    end
  end

  def uncomplete
    @task.uncomplete!
    redirect_back fallback_location: quests_path
  end

  def skip
    @task.skip!(today: Current.user.today)
    redirect_back fallback_location: quests_path
  end

  def defer
    today = Current.user.today
    days = params.fetch(:days, 1).to_i.clamp(1, 30)
    @task.defer!(until_date: today + days)
    redirect_back fallback_location: quests_path
  end

  private
    def set_task
      @task = Current.user.tasks.find(params[:id])
    end

    # "Boss stage cleared" news when a chore was also a stage of a boss battle.
    def boss_notice(results)
      results.map do |battle, result|
        if result.defeated
          "#{battle.title} defeated! +#{result.xp} XP and +#{result.coins} coins for clearing every stage."
        else
          "Boss stage cleared: #{battle.title} has #{battle.reload.health_remaining} HP left."
        end
      end.join(" ")
    end

    def task_params
      params.permit(:title, :notes, :room, :category, :duration_minutes, :effort, :priority,
                    :due_on, :recurrence_kind, :recurrence_interval_days, :monster_key, :assignee_id, :rotate,
                    recurrence_weekdays: [])
    end

    def victory_payload(completion, badges, surprise = nil)
      reward = completion.reward
      progress = Current.user.progress.reload
      first = Current.user.completions.active.count == 1
      {
        id: completion.id,
        task_id: @task.id,
        monster: Game::Catalog.monster(@task.monster_key_or_default)["name"],
        monster_key: @task.monster_key_or_default,
        quest_title: @task.fantasy_title_or_default,
        task_title: @task.title,
        message: Habits::Messages.victory(task: @task, completion: completion, first: first, leveled_up: reward.leveled_up?),
        xp: reward.xp,
        coins: reward.coins,
        level: progress.level,
        leveled_up: reward.leveled_up? || !!surprise&.leveled_up?,
        badges: badges,
        surprise: surprise && { message: surprise.message, xp: surprise.xp, coins: surprise.coins,
                                rare: surprise.rare, gift: surprise.gift },
        xp_to_next: progress.xp_for_next_level - progress.xp_into_level,
        wins_today: wins_today,
        next_quest: next_quest
      }
    end

    def wins_today
      zone = Current.user.zone
      start = zone.local(Current.user.today.year, Current.user.today.month, Current.user.today.day)
      Current.user.completions.active.where(completed_at: start...(start + 1.day)).count
    end

    # An easy follow-on: prefer the same room, shortest first, so one win can
    # roll into the next. Nil when nothing else is ready.
    def next_quest
      ready = Current.user.tasks.available_on(Current.user.today).where.not(id: @task.id).order(:duration_minutes, :id)
      task = ready.where(room: @task.room).first || ready.first
      task && { id: task.id, title: task.title, minutes: task.duration_minutes, xp: task.xp,
                monster_key: task.monster_key_or_default, fantasy_title: task.fantasy_title_or_default }
    end

    def redirect_back_with_errors(task)
      redirect_back(fallback_location: quests_path,
                    inertia: { errors: task.errors.to_hash(true).transform_values(&:first) })
    end
end
