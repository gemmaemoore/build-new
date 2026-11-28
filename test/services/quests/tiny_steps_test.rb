require "test_helper"

class Quests::TinyStepsTest < ActiveSupport::TestCase
  test "steps open and close the same way, with room-specific middles" do
    kitchen = users(:one).tasks.build(title: "Wipe sides", room: "kitchen")
    steps = Quests::TinySteps.call(kitchen)
    assert_equal 5, steps.size
    assert_match(/song|timer/i, steps.first)
    assert_match(/done/i, steps.last)
    assert_includes steps.join(" "), "surface"
  end

  test "rooms without their own steps use the default middle" do
    other = users(:one).tasks.build(title: "Admin", room: "office")
    assert_equal Game::Catalog.tiny_steps["default"], Quests::TinySteps.call(other)[1..-2]
  end

  test "every room in the catalogue has no more than five steps and no blanks" do
    Task::ROOMS.each do |room|
      steps = Quests::TinySteps.call(users(:one).tasks.build(title: "x", room: room))
      assert_operator steps.size, :<=, 6
      assert steps.none?(&:blank?)
    end
  end
end
