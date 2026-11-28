# frozen_string_literal: true

module Tasks
  # Turns one stuck, one-off task into a few tiny real quests and stacks them as
  # a boss battle (so finishing the pieces pays the stacked bonus). The original
  # is retired: archived if it has history, otherwise removed. Repeating chores
  # and tasks already inside a battle are left alone.
  class Split
    Result = Struct.new(:battle, :tasks, keyword_init: true)

    def self.call(task)
      new(task).call
    end

    def initialize(task)
      @task = task
    end

    def call
      return nil unless splittable?

      steps = Game::Catalog.tiny_steps.dig("rooms", @task.room) || Game::Catalog.tiny_steps.fetch("default")
      minutes = [ (@task.duration_minutes / steps.size.to_f).ceil, 2 ].max

      Task.transaction do
        tasks = steps.map do |step|
          @task.user.tasks.create!(title: "#{@task.title}: #{step}".truncate(200), room: @task.room, room_label: @task.room_label,
                                   category: @task.category, effort: "tiny", duration_minutes: minutes, priority: @task.priority,
                                   assignee: @task.assignee)
        end
        battle = BossBattle.build_for(@task.user, title: "Tackle: #{@task.title}".truncate(120),
                                      monster_key: @task.monster_key_or_default, task_ids: tasks.map(&:id))
        battle.save!
        @task.completions.exists? ? @task.archive! : @task.destroy!
        Result.new(battle: battle, tasks: tasks)
      end
    end

    def splittable?
      @task.status == "active" && !@task.recurring? && !in_battle?
    end

    private
      def in_battle?
        BossStage.joins(:boss_battle).merge(BossBattle.active).exists?(task_id: @task.id, completed_at: nil)
      end
  end
end
