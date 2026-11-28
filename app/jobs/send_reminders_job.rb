# frozen_string_literal: true

# Runs every hour. Emails each player who asked for a reminder when their own
# local hour matches, at most once a day, and never when they have already done
# something today (no nagging someone who is doing fine).
class SendRemindersJob < ApplicationJob
  queue_as :default

  def perform(now: Time.current)
    User.where(reminder_enabled: true).find_each do |user|
      local = now.in_time_zone(user.zone)
      next unless local.hour == user.reminder_hour
      next if user.last_reminded_on == local.to_date
      next if done_today?(user, local)

      task = Habits::TodayPicker.new(user: user, today: local.to_date, exclude: nil, energy: "", easier: false).call.task
      next unless task

      ReminderMailer.daily(user, task).deliver_later
      user.update_columns(last_reminded_on: local.to_date)
    end
  end

  private
    def done_today?(user, local)
      user.completions.active.where(completed_at: local.beginning_of_day..local.end_of_day).exists?
    end
end
