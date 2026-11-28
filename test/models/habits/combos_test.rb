require "test_helper"

class Habits::CombosTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
    @user.tasks.destroy_all
  end

  def chore(title, room: "kitchen", minutes: 3)
    @user.tasks.create!(title: title, room: room, room_label: room.humanize, duration_minutes: minutes)
  end

  test "suggests a combo when a room has three or more quick chores" do
    4.times { |i| chore("Kitchen #{i}") }
    chore("Bath", room: "bathroom")
    combo = Habits::Combos.call(@user)
    assert_equal "The Kitchen boss", combo[:title]
    assert_equal 4, combo[:task_ids].size
    assert_equal 12, combo[:minutes]
    assert_operator combo[:bonus_xp], :>, 150
  end

  test "no combo with fewer than three quick chores in one room" do
    2.times { |i| chore("Kitchen #{i}") }
    2.times { |i| chore("Bath #{i}", room: "bathroom") }
    assert_nil Habits::Combos.call(@user)
  end

  test "long chores and chores already in a battle are left out" do
    3.times { |i| chore("Kitchen #{i}") }
    chore("Big job", minutes: 45)
    assert_equal 3, Habits::Combos.call(@user)[:task_ids].size

    battle = BossBattle.build_for(@user, title: "x", monster_key: "toy_swarm", task_ids: @user.tasks.where(duration_minutes: 3).ids).tap(&:save!)
    assert_nil Habits::Combos.call(@user)
    battle.abandon!
    assert Habits::Combos.call(@user)
  end

  test "the combo can be turned into a real boss battle" do
    4.times { |i| chore("Kitchen #{i}") }
    combo = Habits::Combos.call(@user)
    battle = BossBattle.build_for(@user, title: combo[:title], monster_key: combo[:monster_key], task_ids: combo[:task_ids])
    assert battle.save
    assert_equal 4, battle.stages.count(&:linked?)
  end
end
