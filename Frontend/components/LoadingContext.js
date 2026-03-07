import React, { createContext, useState, useContext, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [loadingCount, setLoadingCount] = useState(0);

    useEffect(() => {
        const startListener = DeviceEventEmitter.addListener('apiLoadingStart', () => {
            setLoadingCount(prev => prev + 1);
        });
        const stopListener = DeviceEventEmitter.addListener('apiLoadingStop', () => {
            setLoadingCount(prev => Math.max(0, prev - 1));
        });

        return () => {
            startListener.remove();
            stopListener.remove();
        };
    }, []);

    useEffect(() => {
        setLoading(loadingCount > 0);
    }, [loadingCount]);

    return (
        <LoadingContext.Provider value={{ isGlobalLoading: loading, setGlobalLoading: setLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => useContext(LoadingContext);
