import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32; // mx-4 means 16 each side

type Deal = {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  image?: string;
};

type PromoBannerProps = {
  deals?: Deal[];
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500";

const DEFAULT_DEAL: Deal = {
  title: "35% OFF on Burgers!",
  subtitle: "Limited time offer",
  ctaText: "Order Now",
  image: FALLBACK_IMAGE,
};

export const PromoBanner = ({ deals = [] }: PromoBannerProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter out any null/undefined deals and ensure we have at least one
  const list = React.useMemo(() => {
    const filtered = Array.isArray(deals) ? deals.filter(Boolean) : [];
    return filtered.length > 0 ? filtered : [DEFAULT_DEAL];
  }, [deals]);

  // To create a seamless right-to-left infinite loop, we duplicate the first and last items
  const extendedList = React.useMemo(() => {
    if (list.length <= 1) return list;
    return [list[list.length - 1], ...list, list[0]];
  }, [list]);

  // Initial scroll to the actual first item (skipping the prepended duplicate)
  useEffect(() => {
    setIsInitialized(false);
    if (list.length > 1) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            x: BANNER_WIDTH,
            animated: false,
          });
          setIsInitialized(true);
          setActiveIndex(0);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsInitialized(true);
      setActiveIndex(0);
    }
  }, [list]);

  // Auto-slide effect
  useEffect(() => {
    if (list.length <= 1 || !isInitialized) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const nextScrollIndex = activeIndex + 2; // +1 for next item, +1 for offset
        scrollRef.current.scrollTo({
          x: nextScrollIndex * BANNER_WIDTH,
          animated: true,
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeIndex, list.length, isInitialized]);

  const handleMomentumScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const scrollIndex = Math.round(x / BANNER_WIDTH);
    let newIndex = scrollIndex - 1;

    if (list.length > 1) {
      if (scrollIndex >= list.length + 1) {
        // At the last "fake" item (copy of first item), jump to real first item
        scrollRef.current?.scrollTo({ x: BANNER_WIDTH, animated: false });
        newIndex = 0;
      } else if (scrollIndex <= 0) {
        // At the first "fake" item (copy of last item), jump to real last item
        scrollRef.current?.scrollTo({ x: list.length * BANNER_WIDTH, animated: false });
        newIndex = list.length - 1;
      }
    } else {
      newIndex = 0;
    }

    setActiveIndex(newIndex);
  };

  return (
    <View className="px-4 mt-4">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {extendedList.map((deal, index) => {
          const title = deal?.title || DEFAULT_DEAL.title;
          const subtitle = deal?.subtitle || DEFAULT_DEAL.subtitle;
          const ctaText = deal?.ctaText || DEFAULT_DEAL.ctaText;
          const image = deal?.image || DEFAULT_DEAL.image;

          return (
            <View
              key={`${index}-${title}`}
              style={{ width: BANNER_WIDTH, paddingHorizontal: 6 }}
            >
              <View className="bg-[#F6D977] rounded-[28px] px-6 py-5 min-h-[125px] overflow-hidden flex-row flex-1 shadow-sm">
                {/* Decorative background patterns */}
                <View className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/20" />
                <View className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full bg-black/5" />
                <View className="absolute right-1/4 bottom-0 w-12 h-12 rounded-full bg-white/10" />

                <View className="flex-1 z-10 justify-center">
                  <Text
                    className="text-[#3A2E00] text-[20px] font-extrabold leading-tight tracking-tight"
                    numberOfLines={2}
                  >
                    {title}
                  </Text>
                  <Text
                    className="text-[#5D4A00] text-[13px] font-medium mt-1 mb-4 opacity-80"
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    className="bg-[#222] px-5 py-2 rounded-xl self-start shadow-sm"
                  >
                    <Text className="text-white text-[12px] font-bold">
                      {ctaText}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="w-[45%] items-center justify-center relative">
                  <View className="absolute w-28 h-28 rounded-full bg-white/40 shadow-sm" />
                  <Image
                    source={{ uri: image }}
                    style={{ 
                      width: 130, 
                      height: 130, 
                      marginBottom: -15, 
                      marginRight: -10,
                      transform: [{ rotate: '-4deg' }]
                    }}
                    contentFit="contain"
                    transition={400}
                    cachePolicy="memory-disk"
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Pagination dots */}
      {list.length > 1 && (
        <View className="flex-row justify-center mt-3 gap-2">
          {list.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-6 bg-[#222]" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
};
