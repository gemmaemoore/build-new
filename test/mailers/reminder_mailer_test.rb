require "test_helper"

class ReminderMailerTest < ActionMailer::TestCase
  test "one short email with the task and a working unsubscribe link" do
    user = users(:one)
    task = user.tasks.create!(title: "Wipe the sides", duration_minutes: 5)
    mail = ReminderMailer.daily(user, task)
    assert_equal [ user.email ], mail.to
    assert_includes mail.subject, "Wipe the sides"
    assert_includes mail.text_part.body.to_s, "about 5 minutes"
    token = mail.text_part.body.to_s[%r{reminders/unsubscribe/(\S+)}, 1]
    assert_equal user, User.find_by_token_for(:reminder_unsubscribe, token)
  end
end
