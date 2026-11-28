# frozen_string_literal: true

module Quests
  # Short, concrete steps for a task someone is stuck on, picked by room from
  # config/game/tiny_steps.yml. Always the same for the same room (no AI).
  module TinySteps
    module_function

    def call(task)
      config = Game::Catalog.tiny_steps
      middle = config.dig("rooms", task.room) || config.fetch("default")
      [ config.fetch("opening"), *middle, config.fetch("closing") ]
    end
  end
end
