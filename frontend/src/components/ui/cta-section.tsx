
import { Link } from "react-router-dom"
import { SparklesCore } from "@/components/ui/sparkles"
import { useTheme } from "@/contexts/ThemeContext"

export function CTASection() {
    const { isDark } = useTheme();

    return (
        <section className="py-20 md:py-32 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <SparklesCore
                    id="cta-sparkles"
                    background="transparent"
                    minSize={0.8}
                    maxSize={1.6}
                    particleDensity={100}
                    className="h-full w-full"
                    particleColor={isDark ? "#FFFFFF" : "#0d47a1"}
                />
            </div>
            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center bg-primary/5 rounded-2xl p-8 md:p-12 lg:p-16 border border-primary/10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        Ready to streamline your scheduling?
                    </h2>
                    <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto px-4">
                        Join thousands of businesses already using our platform to manage their appointments efficiently.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-block rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
                    >
                        Sign Up Free
                    </Link>
                </div>
            </div>
        </section>
    )
}
