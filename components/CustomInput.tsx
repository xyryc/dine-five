import React from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

interface CustomInputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

const CustomInput = ({
  label,
  icon,
  className,
  ...props
}: CustomInputProps) => {
  return (
    <View className={className}>
      {/* Label */}
      {label && (
        // Label text with styling
        <Text className="text-black font-medium text-sm">{label}</Text>
      )}

      {/* Input Container */}
      <View className="flex-row items-center bg-white rounded-2xl px-4 h-14 shadow-sm border border-[#8E8E8E] mt-1.5">
        <View className="flex-1 flex-row items-center">
          <TextInput
            className="flex-1 text-gray-800 text-base py-2"
            placeholderTextColor="#BEBEBE"
            {...props}
          />
        </View>

        {/* Right Icon */}
        {icon && <View className="ml-2">{icon}</View>}
      </View>
    </View>
  );
};

export default CustomInput;
