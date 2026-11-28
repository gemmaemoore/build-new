# frozen_string_literal: true

class SettingsController < ApplicationController
  def show
    render inertia: "Settings", props: {
      settings: {
        display_name: Current.user.display_name,
        reduced_motion: Current.user.reduced_motion,
        anchor: Current.user.anchor,
        treat: Current.user.treat,
        reminder_enabled: Current.user.reminder_enabled,
        reminder_hour: Current.user.reminder_hour,
        reminder_email: Current.user.reminder_email
      },
      anchors: Onboarding::Complete::ANCHORS,
      reminder_hours: User::REMINDER_HOURS,
      push: { configured: Push.configured?, public_key: Push.public_key },
      household: Current.user.household_members.map { |m| { id: m.id, name: m.name } }
    }
  end

  def update
    if Current.user.update(settings_params)
      redirect_to settings_path, notice: "Settings saved."
    else
      redirect_to settings_path,
                  inertia: { errors: Current.user.errors.to_hash(true).transform_values(&:first) }
    end
  end

  def settings_params
    permitted = params.permit(:display_name, :reduced_motion, :anchor, :treat, :reminder_enabled, :reminder_hour, :reminder_email)
    permitted[:display_name] = permitted[:display_name].to_s.squish.presence if permitted.key?(:display_name)
    permitted[:treat] = permitted[:treat].to_s.squish.presence if permitted.key?(:treat)
    permitted[:anchor] = permitted[:anchor].presence if permitted.key?(:anchor)
    permitted
  end
  private :settings_params

  def reset
    Onboarding::Reset.call(user: Current.user)
    redirect_to welcome_path, notice: "Your game data was reset. Let's start fresh."
  end
end
