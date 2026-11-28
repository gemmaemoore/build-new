require "test_helper"

class BlitzControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @user.tasks.destroy_all
  end

  def chore(title, minutes)
    @user.tasks.create!(title: title, duration_minutes: minutes)
  end

  test "requires authentication" do
    get blitz_path
    assert_redirected_to login_path
  end

  test "lines up the shortest chores that fit the time" do
    log_in_as(@user)
    chore("Quick", 3)
    chore("Medium", 5)
    chore("Long", 25)
    get blitz_path(minutes: 10)
    assert_response :success
    assert_includes response.body, "Quick"
    assert_includes response.body, "Medium"
    assert_not_includes response.body, "&quot;title&quot;:&quot;Long&quot;"
  end

  test "an odd length falls back to ten minutes" do
    log_in_as(@user)
    get blitz_path(minutes: 999)
    assert_includes response.body, "&quot;minutes&quot;:10"
  end

  test "completing from the blitz rewards once and says so without the victory dialog" do
    log_in_as(@user)
    task = chore("Wipe", 3)
    assert_difference -> { @user.progress.reload.xp }, task.xp do
      post blitz_complete_path(task, minutes: 10)
    end
    assert_redirected_to blitz_path(minutes: 10)
    assert_match "Done!", flash[:notice]
    assert_nil flash[:victory]
  end

  test "cannot complete someone else's chore" do
    log_in_as(@user)
    theirs = users(:two).tasks.create!(title: "Theirs")
    post blitz_complete_path(theirs)
    assert_response :not_found
  end

  test "finishing a sprint with enough chores pays a bonus once" do
    log_in_as(@user)
    tasks = [ chore("A", 2), chore("B", 2), chore("C", 2) ]
    tasks.each { |t| t.complete!(today: @user.today) }
    assert_difference -> { RewardTransaction.where(kind: "blitz").count }, 1 do
      post blitz_finish_path(minutes: 10)
      post blitz_finish_path(minutes: 10)
    end
    assert_equal 15, RewardTransaction.find_by!(kind: "blitz").xp_delta
  end

  test "too few chores earns no bonus" do
    log_in_as(@user)
    chore("A", 2).complete!(today: @user.today)
    assert_no_difference -> { RewardTransaction.where(kind: "blitz").count } do
      post blitz_finish_path(minutes: 10)
    end
  end
end
