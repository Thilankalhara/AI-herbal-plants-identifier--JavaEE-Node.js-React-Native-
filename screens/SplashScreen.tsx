import React, { useEffect, useRef } from "react";
import {
  View,
  ImageBackground,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function SplashScreen({ navigation }: any) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => navigation.replace("Home"), 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/splash.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={styles.content}>
          <Animated.View
            style={[styles.textContainer, { transform: [{ scale }], opacity }]}
          >
            <Text style={styles.title}>   </Text>
            <Text style={styles.subtitle}>Identify • Heal • Grow</Text>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © Designed By Thilan. All rights reserved.
            </Text>

            <View style={styles.socialIcons}>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://discord.com/invite/vfwb7pQW")}
              >
                <Ionicons name="logo-discord" size={22} color="#111" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  Linking.openURL("https://www.linkedin.com/in/thilan-kalhara-06a9b723a")
                }
              >
                <Ionicons name="logo-linkedin" size={22} color="#111" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL("https://github.com/Thilankalhara")}
              >
                <Ionicons name="logo-github" size={22} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", 
  },

  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },


  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.25)", 
  },

  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 80,
  },

  textContainer: {
    alignItems: "center",
    marginBottom: 50,
  },

  title: {
    fontSize: 44,
    fontWeight: "900",
    color: "#1d1d1d",
  },

  subtitle: {
    fontSize: 18,
    color: "#333",
    marginTop: 8,
    fontWeight: "600",
  },

  footer: {
    alignItems: "center",
    width: "100%",
  },

  footerText: {
    fontSize: 12,
    color: "#111",
    marginBottom: 12,
    fontWeight: "600",
  },

  socialIcons: {
    flexDirection: "row",
    gap: 26,
  },
});
