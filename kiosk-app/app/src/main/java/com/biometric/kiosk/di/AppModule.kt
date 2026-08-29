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
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
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

    /**
     * OkHttpClient with a dynamic base-URL interceptor.
     *
     * Retrofit is initialised with a placeholder base URL ("http://localhost/").
     * On every request the interceptor reads the *current* backendUrl from
     * DevicePrefs and rewrites the request's host/port accordingly, so admin
     * URL changes take effect immediately without restarting the app.
     */
    @Provides
    @Singleton
    fun provideOkHttp(prefs: DevicePrefs): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            // Read the live backend URL from prefs on every call
            val newBase = prefs.backendUrl.trimEnd('/').toHttpUrl()
            val originalRequest: Request = chain.request()
            val rewritten = originalRequest.url.newBuilder()
                .scheme(newBase.scheme)
                .host(newBase.host)
                .port(newBase.port)
                .build()
            chain.proceed(originalRequest.newBuilder().url(rewritten).build())
        }
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
        // Placeholder base URL — the dynamic interceptor above rewrites it at runtime
        .baseUrl(prefs.backendUrl.trimEnd('/') + "/")
        .client(okHttp)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    @Provides
    @Singleton
    fun provideKioskApiService(retrofit: Retrofit): KioskApiService =
        retrofit.create(KioskApiService::class.java)
}
