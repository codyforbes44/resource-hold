import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Trash2, LogOut, PanelLeftClose, Search, Settings,
  ShieldCheck, Pencil, LogIn, FlaskConical,
} from "lucide-react";
import logoSrc from "@/assets/logo-gclaw.png";

type Conversation = { id: string; title: string; model: string; created_at: string };

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
  user: any;
  isAdmin: boolean;
  conversations: Conversation[];
  activeConv: string | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  editingConvId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onStartRename: (id: string, title: string) => void;
  onFinishRename: (id: string) => void;
  onSignOut: () => void;
}

const ChatSidebar = ({
  open,
  onClose,
  user,
  isAdmin,
  conversations,
  activeConv,
  searchQuery,
  setSearchQuery,
  editingConvId,
  editTitle,
  setEditTitle,
  onCreateConversation,
  onSelectConversation,
  onDeleteConversation,
  onStartRename,
  onFinishRename,
  onSignOut,
}: ChatSidebarProps) => {
  const navigate = useNavigate();

  const filteredConversations = conversations.filter(
    (c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:relative md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:-translate-x-full md:hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="gClaw" className="h-6 w-6" />
            <span className="font-mono font-bold tracking-tight">
              gClaw <span className="text-muted-foreground font-normal">Chat</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2 space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2 min-h-[44px]" onClick={onCreateConversation}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors min-h-[44px] ${
                activeConv === c.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              }`}
              onClick={() => onSelectConversation(c.id)}
            >
              {editingConvId === c.id ? (
                <form
                  className="flex-1 flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onFinishRename(c.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-6 text-xs"
                    autoFocus
                    onBlur={() => onFinishRename(c.id)}
                  />
                </form>
              ) : (
                <span className="truncate flex-1">{c.title}</span>
              )}
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                  className="text-muted-foreground hover:text-foreground min-h-[32px] min-w-[32px] flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartRename(c.id, c.title);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive min-h-[32px] min-w-[32px] flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </ScrollArea>

        <div className="border-t border-border p-2 space-y-1">
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 min-h-[44px]" onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4" /> Settings
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 min-h-[44px]" onClick={() => navigate("/research")}>
                  <FlaskConical className="h-4 w-4" /> Research
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 min-h-[44px]" onClick={() => navigate("/admin")}>
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive min-h-[44px]"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" className="w-full justify-start gap-2 min-h-[44px] glow-brand" asChild>
              <Link to="/auth">
                <LogIn className="h-4 w-4" /> Sign in to save chats
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
