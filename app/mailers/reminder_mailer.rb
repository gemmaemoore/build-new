# frozen_string_literal: true

# One short, kind email at the player's chosen hour: a single small thing to do.
class ReminderMailer < ApplicationMailer
  def daily(user, task)
    @user = user
    @task = task
    @minutes = task.duration_minutes
    @unsubscribe_url = reminders_unsubscribe_url(token: user.generate_token_for(:reminder_unsubscribe))
    mail to: user.email, subject: "One tiny thing today: #{task.title}"
  end
end
