// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { sendRequest } from "../utils/sendRequest";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const { width } = Dimensions.get("window");
const MAX_DAILY = 10;

type ImageData = {
  uri: string;
  base64?: string;
};

export default function HomeScreen({ navigation }: Props) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCount, setSearchCount] = useState(0);

  useEffect(() => {
    initCounter();
  }, []);

  const initCounter = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const last = await AsyncStorage.getItem("last_search_date");
      if (last !== today) {
        await AsyncStorage.multiSet([
          ["last_search_date", today],
          ["search_count", "0"],
        ]);
        setSearchCount(0);
      } else {
        const cnt = await AsyncStorage.getItem("search_count");
        setSearchCount(parseInt(cnt || "0", 10));
      }
    } catch (err) {
      console.error("Error initializing counter:", err);
    }
  };

  const bump = async () => {
    try {
      const next = searchCount + 1;
      setSearchCount(next);
      await AsyncStorage.setItem("search_count", next.toString());
    } catch (err) {
      console.error("Error updating counter:", err);
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    if (searchCount >= MAX_DAILY) {
      Alert.alert("Limit", "10 searches per day.");
      return;
    }

    try {
      // Request permissions
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert("Permission", "Allow access to camera/gallery.");
        return;
      }

      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        // Camera only supports single image
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
          exif: false, // Reduce memory usage
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: 2,
          exif: false,
        });
      }

      // Check for cancellation
      if (result.canceled) {
        console.log("Image picker cancelled");
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log("No assets selected");
        return;
      }

      // Validate URIs
      const validAssets = result.assets.filter(asset => {
        if (!asset.uri) {
          console.warn("Asset missing URI:", asset);
          return false;
        }
        return true;
      });

      if (validAssets.length === 0) {
        Alert.alert("Error", "Failed to load image.");
        return;
      }

      // Only keep max 2 images
      const newImages = validAssets.slice(0, 2).map(a => ({ 
        uri: a.uri 
      }));

      console.log("Selected images:", newImages);
      setImages(newImages);
    } catch (err: any) {
      console.error("ImagePicker error:", err);
      Alert.alert("Error", err.message || "Failed to pick image.");
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const prepareBase64Images = async (): Promise<string[]> => {
    const base64List: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        console.log(`Processing image ${i + 1}/${images.length}:`, img.uri);
        
        const manipResult = await ImageManipulator.manipulateAsync(
          img.uri,
          [{ resize: { width: 800 } }], // Increased for better quality
          { 
            compress: 0.6, 
            format: ImageManipulator.SaveFormat.JPEG, 
            base64: true 
          }
        );
        
        if (manipResult.base64) {
          base64List.push(manipResult.base64);
          console.log(`Image ${i + 1} processed successfully`);
        } else {
          console.warn(`Image ${i + 1} has no base64 data`);
        }
      } catch (err) {
        console.error(`Error processing image ${i + 1}:`, err);
        // Continue with other images
      }
    }
    
    return base64List;
  };

  const searchPlant = async () => {
    if (images.length === 0) {
      Alert.alert("No Image", "Take a photo or pick from gallery first.");
      return;
    }

    setLoading(true);
    try {
      console.log("Preparing images for search...");
      const base64Array = await prepareBase64Images();

      if (base64Array.length === 0) {
        Alert.alert("Error", "Failed to process images.");
        return;
      }

      console.log(`Sending ${base64Array.length} images to server...`);
      const resp = await sendRequest({ images: base64Array });

      if (resp.ok) {
        await bump();
        navigation.navigate("Result", { data: resp.data, images: base64Array });
      } else {
        Alert.alert("Error", resp.message || "Failed to identify plant.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Herbula</Text>
      <Text style={styles.subtitle}>Identify Healing Plants</Text>

      <View style={styles.buttons}>
        <ActionButton icon="camera" title="Camera" onPress={() => pickImage(true)} />
        <ActionButton icon="images" title="Gallery" onPress={() => pickImage(false)} />
      </View>

      {images.length > 0 && (
        <View style={styles.preview}>
          {images.map((img, i) => (
            <View key={i} style={styles.imgWrapper}>
              <Image 
                source={{ uri: img.uri }} 
                style={styles.img}
                onError={(e) => {
                  console.error(`Image ${i} failed to load:`, e.nativeEvent.error);
                }}
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeImage(i)}
              >
                <Ionicons name="close-circle" size={22} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.searchBtn, (loading || images.length === 0) && styles.disabled]}
        onPress={searchPlant}
        disabled={loading || images.length === 0}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.searchText}>Search Plant</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.counter}>
        <Text style={styles.count}>
          {searchCount} / {MAX_DAILY}
        </Text>
      </View>
    </ScrollView>
  );
}

const ActionButton = ({ icon, title, onPress }: any) => (
  <TouchableOpacity style={styles.btn} onPress={onPress}>
    <Ionicons name={icon} size={24} color="#fff" />
    <Text style={styles.btnText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9fdf9",
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  title: { fontSize: 36, fontWeight: "900", color: "#27ae60", textAlign: "center", marginTop: 30 },
  subtitle: { fontSize: 16, color: "#555", textAlign: "center", marginBottom: 30 },
  buttons: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  btn: {
    backgroundColor: "#27ae60",
    padding: 16,
    borderRadius: 16,
    flex: 0.48,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  btnText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
  preview: { flexDirection: "row", justifyContent: "center", gap: 12, marginVertical: 20, flexWrap: "wrap" },
  imgWrapper: { position: "relative" },
  img: { width: width * 0.44, height: width * 0.44, borderRadius: 16, borderWidth: 2, borderColor: "#ddd" },
  removeBtn: { position: "absolute", top: -6, right: -6 },
  searchBtn: {
    backgroundColor: "#2e8b57",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
  },
  disabled: { opacity: 0.5 },
  searchText: { color: "#fff", marginLeft: 8, fontWeight: "600", fontSize: 16 },
  counter: {
    alignSelf: "center",
    marginTop: 20,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  count: { color: "#27ae60", fontWeight: "600" },
});