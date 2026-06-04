
export function Footer() {
    return (
        <footer className="py-8 px-4 border-t border-border relative z-50 bg-background">
            <div className="container mx-auto text-center text-muted-foreground text-sm">
                <p>© {new Date().getFullYear()} Bookify. All rights reserved.</p>
            </div>
        </footer>
    );
}
