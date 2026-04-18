import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  name: string;
  color: string;
  profileImage?: string;
  size?: number;
  style?: object;
};

export function MemberAvatar({ name, color, profileImage, size = 40, style }: Props) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + "33",
          borderWidth: 2,
          borderColor: color,
        },
        style,
      ]}
    >
      {profileImage ? (
        <Image
          source={{ uri: profileImage }}
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          }}
          contentFit="cover"
        />
      ) : initials ? (
        <Text style={[styles.initials, { color: color, fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      ) : (
        <Feather name="user" size={size * 0.5} color={color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontFamily: "Inter_600SemiBold",
  },
});
