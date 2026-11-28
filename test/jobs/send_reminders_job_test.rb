require "test_helper"

class SendRemindersJobTest < ActiveJob::TestCase
  include ActionMailer::TestHelper

  setup do
    @user = users(:one)
    @user.update!(reminder_enabled: true, reminder_hour: 9, timezone: "UTC", last_reminded_on: nil)
    @user.tasks.destroy_all
    @user.tasks.create!(title: "Wipe the sides")
    @at = Time.utc(2026, 12, 1, 9, 5)
  end

  test "emails once at the chosen local hour" do
    assert_enqueued_emails 1 do
      SendRemindersJob.perform_now(now: @at)
      SendRemindersJob.perform_now(now: @at + 10.minutes)
    end
    assert_equal Date.new(2026, 12, 1), @user.reload.last_reminded_on
  end

  test "does nothing at other hours or when reminders are off" do
    assert_no_enqueued_emails { SendRemindersJob.perform_now(now: @at.change(hour: 14)) }
    @user.update!(reminder_enabled: false)
    assert_no_enqueued_emails { SendRemindersJob.perform_now(now: @at) }
  end

  test "uses each person's own timezone" do
    @user.update!(timezone: "America/New_York")
    assert_no_enqueued_emails { SendRemindersJob.perform_now(now: @at) }
    assert_enqueued_emails(1) { SendRemindersJob.perform_now(now: @at.change(hour: 14, min: 5)) }
  end

  test "does not nag someone who has already done something today" do
    @user.tasks.create!(title: "Done already").complete!(today: Date.new(2026, 12, 1), at: Time.utc(2026, 12, 1, 7))
    assert_no_enqueued_emails { SendRemindersJob.perform_now(now: @at) }
  end

  test "skips when there is nothing to suggest" do
    @user.tasks.destroy_all
    assert_no_enqueued_emails { SendRemindersJob.perform_now(now: @at) }
  end

  test "push-only reminders skip email but still count as sent" do
    require "minitest/mock"
    @user.update!(reminder_email: false)
    @user.push_subscriptions.create!(endpoint: "https://push.example.com/x", p256dh: "p", auth: "a")
    old = ENV.values_at("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY")
    ENV["VAPID_PUBLIC_KEY"], ENV["VAPID_PRIVATE_KEY"] = "pub", "priv"
    sent = []
    begin
      WebPush.stub(:payload_send, ->(**args) { sent << args }) do
        assert_no_enqueued_emails { SendRemindersJob.perform_now(now: @at) }
      end
    ensure
      ENV["VAPID_PUBLIC_KEY"], ENV["VAPID_PRIVATE_KEY"] = old
    end
    assert_equal 1, sent.size
    assert_equal Date.new(2026, 12, 1), @user.reload.last_reminded_on
  end

  test "with email off and no devices nothing is sent and today is not used up" do
    @user.update!(reminder_email: false)
    assert_no_enqueued_emails { SendRemindersJob.perform_now(now: @at) }
    assert_nil @user.reload.last_reminded_on
  end
end
