
import { Link } from "react-router-dom"
import { Calendar } from "lucide-react"

export function LandingFooter() {
    return (
        <footer className="border-t bg-muted/50 max-w-full overflow-x-hidden z-50 relative">
            <div className="container px-4 md:px-6 py-12 max-w-full mx-auto">
                <div className="grid gap-8 md:grid-cols-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-primary">Bookify</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Smarter scheduling, better time.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h3 className="font-semibold">Product</h3>
                        <div className="flex flex-col gap-2">
                            <Link to="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Features
                            </Link>
                            <Link to="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                How it Works
                            </Link>
                            <Link to="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Testimonials
                            </Link>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h3 className="font-semibold">Company</h3>
                        <div className="flex flex-col gap-2">
                            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                About
                            </Link>
                            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Blog
                            </Link>
                            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Careers
                            </Link>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h3 className="font-semibold">Legal</h3>
                        <div className="flex flex-col gap-2">
                            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Privacy Policy
                            </Link>
                            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Terms of Service
                            </Link>
                            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Cookie Policy
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} Bookify. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}
