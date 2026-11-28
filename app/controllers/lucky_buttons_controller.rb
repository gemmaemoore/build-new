# frozen_string_literal: true

# The once-a-day lucky button on Today. Always pays something small; opening it
# again the same day does nothing.
class LuckyButtonsController < ApplicationController
  def create
    result = Game::Surprise.daily(user: Current.user)
    flash[:notice] = result.summary if result
    redirect_back fallback_location: root_path
  end
end
