"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface TypewriterProps {
    text: string
    speed?: number
    cursor?: string
    loop?: boolean
    className?: string
}

export function Typewriter({
    text,
    speed = 50,
    cursor = "|",
    loop = false,
    className,
}: TypewriterProps) {
    const [displayText, setDisplayText] = useState("")
    const [isTyping, setIsTyping] = useState(true)

    useEffect(() => {
        let i = 0
        let timer: NodeJS.Timeout

        const type = () => {
            if (i < text.length) {
                setDisplayText(text.substring(0, i + 1))
                i++
                timer = setTimeout(type, speed)
            } else {
                setIsTyping(false)
                if (loop) {
                    setTimeout(() => {
                        setDisplayText("")
                        i = 0
                        setIsTyping(true)
                        type()
                    }, 2000)
                }
            }
        }

        type()

        return () => clearTimeout(timer)
    }, [text, speed, loop])

    return (
        <span className={className}>
            {displayText}
            {isTyping && (
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                >
                    {cursor}
                </motion.span>
            )}
        </span>
    )
}
