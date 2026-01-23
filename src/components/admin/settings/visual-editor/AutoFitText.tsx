"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";

interface AutoFitTextProps {
    content: string;
    maxWidth: number; // in pixels
    maxHeight: number; // in pixels
    initialFontSize: number; // in pixels
    minFontSize?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const AutoFitText: React.FC<AutoFitTextProps> = ({
    content,
    maxWidth,
    maxHeight,
    initialFontSize,
    minFontSize = 4,
    className,
    style,
}) => {
    const [fontSize, setFontSize] = useState(initialFontSize);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLSpanElement>(null);
    const [isReady, setIsReady] = useState(false);

    // We use useLayoutEffect to perform measurements before the browser paints
    useLayoutEffect(() => {
        if (!containerRef.current || !contentRef.current || !content) {
            setIsReady(true);
            return;
        }

        const container = containerRef.current;
        const contentEl = contentRef.current;
        let currentFontSize = initialFontSize;

        // Reset font size to initial to start calculation
        container.style.fontSize = `${currentFontSize}px`;

        // Use a small epsilon to account for subpixel rendering
        const EPSILON = 1;

        // Simple iterative reduction to fit
        // For performance, we could use binary search, but labels usually don't have enough text to make this a bottleneck
        // We measure the CONTENT element, not the container, against the MAX dimensions
        while (
            (contentEl.offsetWidth > maxWidth + EPSILON || contentEl.offsetHeight > maxHeight + EPSILON) &&
            currentFontSize > minFontSize
        ) {
            currentFontSize -= 0.5;
            container.style.fontSize = `${currentFontSize}px`;
        }

        setFontSize(currentFontSize);
        setIsReady(true);
    }, [content, maxWidth, maxHeight, initialFontSize, minFontSize]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                ...style,
                fontSize: `${fontSize}px`,
                width: `${maxWidth}px`,
                height: `${maxHeight}px`,
                overflow: "hidden",
                display: "flex",
                alignItems: "center", // Vertical center
                justifyContent: "center", // Horizontal center
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textAlign: (style?.textAlign as any) || "center",
                visibility: isReady ? "visible" : "hidden",
            }}
        >
            <span
                ref={contentRef}
                style={{
                    display: "inline-block",
                    width: "auto",
                    height: "auto",
                    maxWidth: "100%", // Don't let it exceed container naturally
                }}
            >
                {content}
            </span>
        </div>
    );
};
