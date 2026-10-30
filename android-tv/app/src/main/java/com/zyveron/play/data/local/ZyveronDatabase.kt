package com.zyveron.play.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [ChannelEntity::class, CategoryEntity::class],
    version = 1,
    exportSchema = false
)
abstract class ZyveronDatabase : RoomDatabase() {

    abstract fun channelDao(): ChannelDao

    companion object {
        @Volatile
        private var INSTANCE: ZyveronDatabase? = null

        fun getInstance(context: Context): ZyveronDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ZyveronDatabase::class.java,
                    "zyveron_play.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

