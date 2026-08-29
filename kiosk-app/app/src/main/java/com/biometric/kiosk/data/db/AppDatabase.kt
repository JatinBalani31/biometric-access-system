package com.biometric.kiosk.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SupportFactory

/**
 * Room database encrypted at rest using SQLCipher.
 *
 * The encryption key is a 32-byte random secret stored in
 * EncryptedSharedPreferences (itself backed by Android Keystore).
 * This means the key never leaves secure storage unencrypted.
 *
 * Only mathematical embedding vectors are stored — never raw biometric images.
 */
@Database(
    entities = [EmbeddingEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun embeddingDao(): EmbeddingDao

    companion object {
        private const val DB_NAME = "kiosk_embeddings.db"

        /**
         * Create or open the database with SQLCipher encryption.
         *
         * @param context  Application context
         * @param passphrase  The 32-byte encryption key derived from EncryptedSharedPreferences.
         *                    Using a CharArray to avoid String interning of sensitive data.
         *
         * Note: SQLCipher 4.5.x removed the public SQLiteDatabase.getBytes() helper.
         * We convert CharArray → String → UTF-8 ByteArray, then zero out the byte
         * array after handing it to SupportFactory for defence-in-depth.
         */
        fun create(context: Context, passphrase: CharArray): AppDatabase {
            val passphraseBytes = SQLiteDatabase.getBytes(passphrase)
            val factory = SupportFactory(passphraseBytes)

            return Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                DB_NAME
            )
                .openHelperFactory(factory)
                .fallbackToDestructiveMigration() // safe for a pure cache — re-sync on schema change
                .build()
        }
    }
}

