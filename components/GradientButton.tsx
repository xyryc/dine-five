import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity, useWindowDimensions } from "react-native";

interface GradientButtonProps {
  title: string;
  onPress?: () => void;
  className?: string;
  textClassName?: string;
}

const GradientButton = ({
  title,
  onPress,
  className = "",
  textClassName = "",
}: GradientButtonProps) => {
  const { height, width } = useWindowDimensions();
  
  // Calculate dynamic height (approx 5.5% of screen height, capped between 42 and 56)
  const buttonHeight = Math.min(Math.max(height * 0.055, 42), 56);
  const fontSize = Math.min(Math.max(width * 0.045, 16), 20);

  return (
    <TouchableOpacity 
      onPress={onPress} 
      className={className}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={["#FFCD39", "#f5d78c", "#FFCD39"]} // Light yellow to darker yellow
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.2, 0.7]}
        style={{
          borderRadius: 16,
          height: buttonHeight,
        }}
        className="items-center justify-center px-4"
      >
        <Text 
          style={{ fontSize }}
          className={`text-black font-bold ${textClassName}`}
        >
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default GradientButton;
