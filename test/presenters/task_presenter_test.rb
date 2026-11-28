require "test_helper"

class TaskPresenterTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
    @user.tasks.destroy_all
    @task = @user.tasks.create!(title: "Wipe sides", recurrence_kind: "completion", recurrence_interval_days: 1)
  end

  def json
    TaskPresenter.new(@task, today: @user.today, last_done: TaskPresenter.last_done_map([ @task ])[@task.id]).as_json
  end

  test "a chore never done has no last-done date" do
    assert_nil json[:last_done_days]
  end

  test "reports whole days since it was last done" do
    @task.complete!(today: @user.today, at: 3.days.ago)
    assert_equal 3, json[:last_done_days]
  end

  test "an undone completion does not count" do
    @task.complete!(today: @user.today, at: 3.days.ago)
    @task.uncomplete!
    assert_nil json[:last_done_days]
  end

  test "a chore stacked into an active battle reports its boss progress" do
    other = @user.tasks.create!(title: "Mop")
    third = @user.tasks.create!(title: "Bins")
    battle = BossBattle.build_for(@user, title: "Kitchen boss", monster_key: "counter_goblins", task_ids: [ @task.id, other.id, third.id ]).tap(&:save!)
    other.complete!(today: @user.today)
    map = TaskPresenter.boss_map([ @task, other ])
    assert_equal({ title: "Kitchen boss", done: 1, total: 3, id: battle.id }, map[@task.id])
    battle.abandon!
    assert_empty TaskPresenter.boss_map([ @task ])
  end
end
