# frozen_string_literal: true

module Habits
  # Suggests one stackable "combo": a handful of quick chores in the same room
  # that could be fought as a boss battle for a bigger payout. Suggestions only;
  # nothing is created until the player taps the button.
  class Combos
    MIN = BossBattle::MIN_STAGES
    MAX = 5
    QUICK_MINUTES = 10

    def self.call(user, today: user.today)
      new(user, today).call
    end

    def initialize(user, today)
      @user = user
      @today = today
    end

    def call
      linked = BossStage.joins(:boss_battle).merge(BossBattle.active).where(completed_at: nil).pluck(:task_id).compact
      quick = @user.tasks.available_on(@today).where(duration_minutes: ..QUICK_MINUTES).where.not(id: linked)
                   .order(:duration_minutes, :id).to_a
      room, tasks = quick.group_by(&:room).reject { |r, _| r == "other" }.max_by { |_, list| list.size }
      return nil unless tasks && tasks.size >= MIN

      picked = tasks.first(MAX)
      label = picked.first.room_label.to_s.sub(/ \d+\z/, "").presence || room.tr("_", " ").capitalize
      reward = Game::Economy.boss_defeat(stages: picked.size)
      {
        title: "The #{label} boss",
        monster_key: Game::Catalog.monster_key_for(room: room, category: picked.first.category),
        task_ids: picked.map(&:id),
        chores: picked.map(&:title),
        minutes: picked.sum(&:duration_minutes),
        bonus_xp: reward[:xp] + Game::Economy.boss_stage_xp * picked.size,
        bonus_coins: reward[:coins]
      }
    end
  end
end
