
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">Bookify</span>
                </Link>

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Link to="/login">
                        <Button variant="ghost" size="sm">
                            Login
                        </Button>
                    </Link>
                    <Link to="/signup">
                        <Button size="sm">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
