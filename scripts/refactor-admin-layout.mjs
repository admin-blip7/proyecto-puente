import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'src', 'app');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const adminLayoutPath = path.join(appDir, 'admin', 'layout.tsx');

let filesToUpdate = [];

walkDir(path.join(appDir, 'admin'), (filePath) => {
    if (filePath.endsWith('page.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('<LeftSidebar />')) {
            filesToUpdate.push(filePath);
        }
    }
});

// Update each page
filesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');

    // Regex to remove the entire mobile Sheet div
    const sheetRegex = /<div className="absolute top-4 left-4 z-50 md:hidden">[\s\S]*?<\/div>/g;
    content = content.replace(sheetRegex, '');

    // Also remove the hidden md:flex desktop sidebar since we will move it to layout
    const desktopSidebarRegex = /<div className="hidden md:flex">\s*<LeftSidebar \/>\s*<\/div>/g;
    content = content.replace(desktopSidebarRegex, '');

    // Now if the page returns a layout like:
    // <div className="flex h-screen w-full flex-row"> ... <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12"> ... </main> </div>
    // We want to just return the <main> part, or at least let the layout provide the flex container.
    // Actually, the easiest is to just let the layout provide the flex container and the LeftSidebar, and the page only provides <main>.

    // Let's replace:
    // <div className="flex h-screen w-full flex-row"> .... <main className="..."> (content) </main> </div>
    // with just:
    // <main className="..."> (content) </main>

    // We'll strip `<div className="flex h-screen w-full flex-row">` and its closing `</div>`
    // This is a bit tricky with regex, so we'll do:
    content = content.replace(/<div className="flex h-screen w-full flex-row">/, '<div className="flex-1 h-full w-full">');
    // Wait, if layout wraps it in flex h-screen, the flex-1 here is fine.

    // Remove unused imports (Sheet, Menu, LeftSidebar)
    content = content.replace(/import LeftSidebar from "[^"]+";\n?/g, '');
    content = content.replace(/import \{ Sheet, [^\}]+ \} from "[^"]+";\n?/g, '');
    content = content.replace(/import \{ Button \} from "@/components / ui / button";\n?/g, '');
  content = content.replace(/import \{ Menu \} from "lucide-react";\n?/g, '');

    fs.writeFileSync(file, content);
});

console.log(`Updated ${filesToUpdate.length} page files.`);

// Update admin layout
const layoutContent = `
export const dynamic = "force-dynamic";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full flex-row bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
         <LeftSidebar />
      </div>

      {/* Mobile Drawer Navigation (Enhanced) */}
      <div className="absolute top-4 left-4 z-50 md:hidden">
         <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="bg-white/80 dark:bg-card/80 backdrop-blur-md shadow-lg border-white/20">
                  <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar-bg border-r border-white/10 shadow-2xl">
              <SheetTitle className="sr-only">Admin Menu</SheetTitle>
              <LeftSidebar isMobile={true} />
            </SheetContent>
         </Sheet>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative">
        {children}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(adminLayoutPath, layoutContent);
console.log('Updated admin layout.');
