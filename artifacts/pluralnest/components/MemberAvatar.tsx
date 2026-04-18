import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Svg, Defs, ClipPath, Path, Image as SvgImage, Text as SvgText } from "react-native-svg";

import { AvatarShape } from "@/context/StorageContext";

// All paths are normalized to a 100×100 viewBox
const SHAPE_PATHS: Record<AvatarShape, string> = {
  circle:  "M50,5 A45,45,0,1,1,49.9999,5 Z",
  square:  "M16,5 L84,5 Q95,5 95,16 L95,84 Q95,95 84,95 L16,95 Q5,95 5,84 L5,16 Q5,5 16,5 Z",
  diamond: "M50,4 L96,50 L50,96 L4,50 Z",
  heart:   "M50,30 C50,22 58,15 68,15 C83,15 90,28 90,38 C90,55 75,68 50,85 C25,68 10,55 10,38 C10,28 17,15 32,15 C42,15 50,22 50,30 Z",
};

type Props = {
  name: string;
  color: string;
  profileImage?: string;
  size?: number;
  shape?: AvatarShape;
  style?: object;
};

let _uid = 0;

export function MemberAvatar({
  name,
  color,
  profileImage,
  size = 40,
  shape = "circle",
  style,
}: Props) {
  const clipId = React.useRef(`av-clip-${++_uid}`).current;

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Circle and square work perfectly with native borderRadius + overflow hidden
  if (shape === "circle" || shape === "square") {
    const borderRadius = shape === "circle" ? size / 2 : size * 0.16;
    return (
      <View
        style={[
          styles.base,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: color + "33",
            borderWidth: Math.max(1.5, size * 0.025),
            borderColor: color,
          },
          style,
        ]}
      >
        {profileImage ? (
          <Image
            source={{ uri: profileImage }}
            style={{ width: size - 4, height: size - 4, borderRadius: Math.max(0, borderRadius - 2) }}
            contentFit="cover"
          />
        ) : initials ? (
          <Text style={[styles.initials, { color, fontSize: size * 0.35 }]}>{initials}</Text>
        ) : (
          <Feather name="user" size={size * 0.5} color={color} />
        )}
      </View>
    );
  }

  // Heart and diamond use SVG clipping
  const shapePath = SHAPE_PATHS[shape];
  const strokeWidth = Math.max(2, size * 0.06);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={shapePath} />
          </ClipPath>
        </Defs>

        {/* Tinted background */}
        <Path d={shapePath} fill={color + "33"} />

        {/* Profile image clipped to shape */}
        {profileImage ? (
          <SvgImage
            href={profileImage}
            x="0"
            y="0"
            width="100"
            height="100"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : initials ? (
          <SvgText
            x="50"
            y="57"
            textAnchor="middle"
            fontSize={34}
            fontWeight="600"
            fill={color}
          >
            {initials}
          </SvgText>
        ) : null}

        {/* Colored border */}
        <Path d={shapePath} fill="none" stroke={color} strokeWidth={strokeWidth} />
      </Svg>

      {/* Fallback icon (no image, no initials) */}
      {!profileImage && !initials && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Feather name="user" size={size * 0.5} color={color} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontFamily: "Inter_600SemiBold",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
