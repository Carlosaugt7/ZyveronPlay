# =====================================================================
# Zyveron Play - Regras de Otimização R8 / ProGuard para Android TV
# Garante tamanho ultraleve sem quebrar reflexão, Room ou Media3
# =====================================================================

# 1. Media3 / ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# 2. Room Database
-keep class * extends androidx.room.RoomDatabase
-keep class * extends androidx.room.RoomDatabase$Callback
-keep @androidx.room.Dao interface * { *; }
-keep @androidx.room.Entity class * { *; }
-dontwarn androidx.room.paging.**

# 3. Modelos de Dados e Entidades (Protege serialização de listas e canais)
-keep class com.zyveron.play.data.local.** { *; }
-keep class com.zyveron.play.data.model.** { *; }
-keep class com.zyveron.play.data.remote.** { *; }

# 4. Kotlinx Serialization e JSON
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
    @kotlinx.serialization.SerialName <fields>;
}
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class kotlinx.serialization.** { *; }

# 5. OkHttp e Redes
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# 6. Firebase Firestore
-keep class com.google.firebase.** { *; }
-keepclassmembers class * {
    @com.google.firebase.firestore.PropertyName <fields>;
    @com.google.firebase.firestore.PropertyName <methods>;
}

# 7. FileProvider (Necessário para o instalador OTA de atualizações)
-keep class androidx.core.content.FileProvider { *; }
