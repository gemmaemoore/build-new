class CreatePushSubscriptions < ActiveRecord::Migration[8.0]
  def change
    create_table :push_subscriptions do |t|
      t.references :user, null: false, foreign_key: true
      t.text :endpoint, null: false
      t.string :p256dh, null: false
      t.string :auth, null: false
      t.timestamps
    end
    add_index :push_subscriptions, :endpoint, unique: true

    add_column :users, :reminder_email, :boolean, null: false, default: true
  end
end
