"use client";
import React, { useRef, useState } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TiltProps = {
    children: React.ReactNode;
    className?: string;
    rotationFactor?: number;
    isRevese?: boolean;
    springOptions?: {
        stiffness?: number;
        damping?: number;
        mass?: number;
    };
};

export const Tilt = ({
    children,
    className,
    rotationFactor = 15,
    isRevese = false,
    springOptions = {
        stiffness: 150,
        damping: 10,
        mass: 0.1,
    },
}: TiltProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, springOptions);
    const mouseYSpring = useSpring(y, springOptions);

    const rotateX = useTransform(
        mouseYSpring,
        [-0.5, 0.5],
        isRevese ? [rotationFactor, -rotationFactor] : [-rotationFactor, rotationFactor]
    );
    const rotateY = useTransform(
        mouseXSpring,
        [-0.5, 0.5],
        isRevese ? [-rotationFactor, rotationFactor] : [rotationFactor, -rotationFactor]
    );

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className={cn("relative", className)}
        >
            {children}
        </motion.div>
    );
};
