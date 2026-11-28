require "test_helper"

class LuckyButtonsControllerTest < ActionDispatch::IntegrationTest
  test "requires authentication" do
    post lucky_button_path
    assert_redirected_to login_path
  end

  test "opening the button pays once a day and Today shows it opened" do
    user = users(:one)
    log_in_as(user)
    assert_difference -> { RewardTransaction.where(user: user, kind: "surprise").count }, 1 do
      post lucky_button_path
      post lucky_button_path
    end
    assert flash[:notice].present?
    get root_path
    assert_includes response.body, "&quot;opened&quot;:true"
  end
end
