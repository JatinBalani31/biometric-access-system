package com.biometric.kiosk.di

import android.content.Context
import com.biometric.kiosk.data.api.KioskApiService
import com.biometric.kiosk.data.db.AppDatabase
import com.biometric.kiosk.data.db.EmbeddingDao
import com.biometric.kiosk.data.prefs.DevicePrefs
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDevicePrefs(@ApplicationContext context: Context): DevicePrefs =
        DevicePrefs(context)

    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context,
        prefs: DevicePrefs
    ): AppDatabase = AppDatabase.create(context, prefs.getOrCreateDbKey())

    @Provides
    @Singleton
    fun provideEmbeddingDao(db: AppDatabase): EmbeddingDao = db.embeddingDao()

    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    @Provides
    @Singleton
    fun provideOkHttp(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
        )
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttp: OkHttpClient,
        moshi: Moshi,
        prefs: DevicePrefs
    ): Retrofit = Retrofit.Builder()
        .baseUrl(prefs.backendUrl.trimEnd('/') + "/")
        .client(okHttp)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    @Provides
    @Singleton
    fun provideKioskApiService(retrofit: Retrofit): KioskApiService =
        retrofit.create(KioskApiService::class.java)
}
