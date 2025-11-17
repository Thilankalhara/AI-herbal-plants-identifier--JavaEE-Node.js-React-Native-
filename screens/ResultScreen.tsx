import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";

const { width } = Dimensions.get("window");

type ResultProps = {
  route: {
    params: {
      data: {
        name: string;
        description: string;
        uses: string;
        health_benefits: string;
        problems_solved: string;
        category: "herbal" | "poisonous" | "non_herbal";
      };
      images: string[];
    };
  };
};

export default function ResultScreen({ route }: ResultProps) {
  const { data, images } = route.params;

  const borderColor =
    data.category === "herbal"
      ? "#27ae60"
      : data.category === "poisonous"
      ? "#e74c3c"
      : "#f1c40f";

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0 },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true} // vertical scrollbar
      >
        {/* uploaded images */}
        {images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true} // horizontal scrollbar
            style={styles.imgRow}
          >
            {images.map((b64, i) => (
              <Image
                key={i}
                source={{ uri: `data:image/jpeg;base64,${b64}` }}
                style={styles.img}
              />
            ))}
          </ScrollView>
        )}

        {/* AI result card */}
        <View style={[styles.card, { borderLeftColor: borderColor }]}>
          <Text style={styles.plantName}>{data.name}</Text>

          <Info label="Category" value={data.category.toUpperCase()} />
          <Info label="Description" value={data.description} />
          <Info label="Common Uses" value={data.uses} />
          <Info label="Health Benefits" value={data.health_benefits} />
          <Info label="Problems Solved" value={data.problems_solved} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value || "-"}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  container: { padding: 20, alignItems: "center" },
  imgRow: {
    flexDirection: "row",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  img: {
    width: width * 0.5,
    height: width * 0.5,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    elevation: 3,
    borderLeftWidth: 6,
  },
  plantName: { fontSize: 24, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  row: { marginBottom: 10 },
  label: { fontWeight: "600", color: "#2c3e50", marginBottom: 2 },
  value: { color: "#34495e", lineHeight: 20 },
});
