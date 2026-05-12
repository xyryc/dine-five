import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

export const SearchBar = ({
    searchText,
    onSearch,
    onFilterPress
}: {
    searchText?: string;
    onSearch?: (text: string) => void;
    onFilterPress?: () => void;
}) => {
    return (
        <View className="px-4 mt-3">
            <View className="flex-row items-center bg-white rounded-2xl border border-[#EBEBEB] h-11 px-3 shadow-sm">
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                    placeholder="Search dishes, restaurants"
                    className="flex-1 ml-2 text-[#4B5563] h-full text-sm"
                    placeholderTextColor="#9CA3AF"
                    value={searchText}
                    onChangeText={onSearch}
                />
                <TouchableOpacity
                    onPress={onFilterPress}
                    className="w-8 h-8 bg-yellow-400 rounded-full items-center justify-center shadow-sm">
                    <Ionicons name="options-outline" size={16} color="#5A4A00" />
                </TouchableOpacity>
            </View>
        </View>
    );
};
