import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

export const SearchBar = ({
    searchText,
    onSearch,
    onFilterPress,
    onPress,
    editable = true,
}: {
    searchText?: string;
    onSearch?: (text: string) => void;
    onFilterPress?: () => void;
    onPress?: () => void;
    editable?: boolean;
}) => {
    const renderInput = () => (
        <TextInput
            placeholder="Search dishes, restaurants"
            className="flex-1 ml-2 text-[#4B5563] text-sm py-2.5"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={onSearch}
            editable={editable && !onPress}
            pointerEvents={onPress ? "none" : "auto"}
        />
    );

    const content = (
        <View className="flex-row items-center bg-white rounded-2xl border border-[#EBEBEB] px-3 shadow-sm">
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            {renderInput()}
            <TouchableOpacity
                onPress={onFilterPress}
                disabled={!!onPress}
                className="w-8 h-8 bg-yellow-400 rounded-full items-center justify-center shadow-sm">
                <Ionicons name="options-outline" size={16} color="#5A4A00" />
            </TouchableOpacity>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity activeOpacity={0.9} onPress={onPress} className="px-4 mt-3">
                {content}
            </TouchableOpacity>
        );
    }

    return (
        <View className="px-4 mt-3">
            {content}
        </View>
    );
};
