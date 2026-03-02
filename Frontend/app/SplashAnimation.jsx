import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';

const animationSource = require('../assets/Splash/splash-screen-animation.json');

const rawDurationMs =
  animationSource?.op && animationSource?.fr
    ? Math.ceil((animationSource.op / animationSource.fr) * 1000)
    : 1600;
const defaultMinimumDisplayMs = Math.max(rawDurationMs + 400, 1800);

export default function SplashAnimation({
  onFinish,
  animationSpeed = 1,
  minimumDisplayMs = defaultMinimumDisplayMs,
  postAnimationHoldMs = 3000,
}) {
  const hiddenNativeSplashRef = useRef(false);
  const finishedRef = useRef(false);
  const finishTimeoutRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lottieRef = useRef(null);

  const hideNativeSplashOnce = useCallback(() => {
    if (hiddenNativeSplashRef.current) return;
    hiddenNativeSplashRef.current = true;
    SplashScreen.hideAsync().catch(() => { });
  }, []);

  const finalize = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  }, [onFinish]);

  const handleAnimationFinish = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(minimumDisplayMs - elapsed, 0) + postAnimationHoldMs;

    if (remaining > 0) {
      finishTimeoutRef.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, [finalize, minimumDisplayMs, postAnimationHoldMs]);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const playTimer = setTimeout(() => {
      hideNativeSplashOnce();
      const endFrame =
        typeof animationSource?.op === 'number' ? animationSource.op : undefined;
      lottieRef.current?.reset();
      if (endFrame != null) {
        lottieRef.current?.play(0, endFrame);
      } else {
        lottieRef.current?.play();
      }
    }, 120);

    return () => {
      clearTimeout(playTimer);
    };
  }, [hideNativeSplashOnce]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container} onLayout={hideNativeSplashOnce}>
      <LottieView
        ref={lottieRef}
        source={animationSource}
        autoPlay={false}
        loop={false}
        speed={animationSpeed}
        style={styles.animation}
        resizeMode="contain"
        onAnimationFinish={handleAnimationFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
