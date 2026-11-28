require "test_helper"

class Tasks::SplitTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
    @user.tasks.destroy_all
    @task = @user.tasks.create!(title: "Sort the paperwork", room: "office", duration_minutes: 30)
  end

  test "a one-off becomes tiny quests stacked as a boss battle, and the original goes" do
    result = Tasks::Split.call(@task)
    assert_equal 3, result.tasks.size
    assert result.tasks.all? { |t| t.effort == "tiny" && t.title.start_with?("Sort the paperwork: ") }
    assert_equal result.tasks.map(&:id), result.battle.stages.map(&:task_id)
    assert_equal 10, result.tasks.first.duration_minutes
    assert_not Task.exists?(@task.id)
  end

  test "a task with history is archived instead of deleted" do
    @task.complete!(today: @user.today)
    @task.uncomplete!
    @task.update!(completed_at: nil)
    Tasks::Split.call(@task)
    assert_equal "archived", @task.reload.status
  end

  test "repeating chores are left alone" do
    daily = @user.tasks.create!(title: "Wipe sides", recurrence_kind: "completion", recurrence_interval_days: 1)
    assert_nil Tasks::Split.call(daily)
    assert Task.exists?(daily.id)
  end

  test "a task already stacked in a live battle is left alone" do
    others = 2.times.map { |i| @user.tasks.create!(title: "Other #{i}") }
    BossBattle.build_for(@user, title: "x", monster_key: "toy_swarm", task_ids: [ @task.id, *others.map(&:id) ]).save!
    assert_nil Tasks::Split.call(@task)
  end

  test "assignee carries over to the pieces" do
    sam = @user.household_members.create!(name: "Sam")
    @task.update!(assignee: sam)
    assert Tasks::Split.call(@task).tasks.all? { |t| t.assignee == sam }
  end
end
