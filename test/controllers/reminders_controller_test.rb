require "test_helper"

class RemindersControllerTest < ActionDispatch::IntegrationTest
  test "the signed link switches reminders off without logging in" do
    user = users(:one)
    user.update!(reminder_enabled: true)
    get reminders_unsubscribe_path(token: user.generate_token_for(:reminder_unsubscribe))
    assert_response :success
    assert_not user.reload.reminder_enabled
  end

  test "a bad link changes nothing and says so" do
    user = users(:one)
    user.update!(reminder_enabled: true)
    get reminders_unsubscribe_path(token: "nope")
    assert_response :success
    assert user.reload.reminder_enabled
    assert_includes response.body, "&quot;done&quot;:false"
  end

  test "reminder settings save, and only allowed hours are accepted" do
    log_in_as(users(:one))
    patch settings_path, params: { reminder_enabled: true, reminder_hour: 18 }
    assert users(:one).reload.reminder_enabled
    assert_equal 18, users(:one).reminder_hour
    patch settings_path, params: { reminder_hour: 3 }
    assert_equal 18, users(:one).reload.reminder_hour
  end
end
