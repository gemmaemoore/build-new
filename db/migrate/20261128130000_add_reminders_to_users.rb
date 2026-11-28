class AddRemindersToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :reminder_enabled, :boolean, null: false, default: false
    add_column :users, :reminder_hour, :integer, null: false, default: 9
    add_column :users, :last_reminded_on, :date
  end
end
