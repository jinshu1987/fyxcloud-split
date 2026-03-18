import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Search, Database, Brain, AlertTriangle, Shield, Cloud, FolderKanban,
  User, ArrowRight, Command, Loader2, X, FileText
} from "lucide-react";
import { createPortal } from "react-dom";

interface SearchItem {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  href: string;
  icon?: string;
}

interface SearchCategory {
  category: string;
  items: SearchItem[];
}

interface SearchResponse {
  results: SearchCategory[];
  query: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  "Assets": Database,
  "AI Models": Brain,
  "Findings": AlertTriangle,
  "Policies": Shield,
  "Connectors": Cloud,
  "Projects": FolderKanban,
  "Users": User,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Assets": "#007aff",
  "AI Models": "#8b5cf6",
  "Findings": "#f59e0b",
  "Policies": "#10b981",
  "Connectors": "#06b6d4",
  "Projects": "#f97316",
  "Users": "#ec4899",
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [, navigate] = useLocation();

  const allItems = results.flatMap(c => c.items);
  const totalResults = allItems.length;

  const openDialog = useCallback(() => {
    setOpen(true);
    setAnimating(true);
    requestAnimationFrame(() => setAnimating(false));
  }, []);

  const closeDialog = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setOpen(false);
      setAnimating(false);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }, 150);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchResults]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) closeDialog();
        else openDialog();
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, openDialog, closeDialog]);

  useEffect(() => {
    if (open && !animating) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, animating]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!resultsRef.current) return;
    const selected = resultsRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleSelect = (item: SearchItem) => {
    navigate(item.href);
    closeDialog();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      handleSelect(allItems[selectedIndex]);
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-[#007aff] font-bold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const isVisible = open && !animating;
  const isClosing = open && animating;

  const overlay = open ? createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      data-testid="global-search-overlay"
    >
      <div
        onClick={closeDialog}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          opacity: isVisible ? 1 : isClosing ? 0 : 0,
          transition: "opacity 150ms ease-out",
        }}
      />

      <div
        ref={dialogRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "580px",
          margin: "0 16px",
          opacity: isVisible ? 1 : isClosing ? 0 : 0,
          transform: isVisible ? "translateY(0) scale(1)" : isClosing ? "translateY(-8px) scale(0.98)" : "translateY(8px) scale(0.98)",
          transition: "opacity 150ms ease-out, transform 200ms ease-out",
        }}
        data-testid="global-search-dialog"
      >
        <div
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1), 0 0 80px -20px rgba(59, 130, 246, 0.15)",
          }}
          className="bg-card border border-border/50"
        >
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40">
            <Search className="h-[18px] w-[18px] text-[#007aff] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search everything..."
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none font-['Nunito_Sans']"
              data-testid="input-global-search"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[#007aff] shrink-0" />}
            {query && !loading && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                data-testid="button-clear-search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={closeDialog}
              className="shrink-0 h-6 px-1.5 text-[11px] font-medium rounded-md bg-muted/60 border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              ESC
            </button>
          </div>

          <div ref={resultsRef} className="overflow-y-auto" style={{ maxHeight: "min(420px, 50vh)" }}>
            {query.length < 2 && (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#007aff]/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-5 w-5 text-[#007aff]/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground/80">Type to search</p>
                <p className="text-xs text-muted-foreground/50 mt-1.5">
                  Assets, models, findings, policies, connectors, projects & users
                </p>
              </div>
            )}

            {query.length >= 2 && !loading && results.length === 0 && (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground/80">No results for "{query}"</p>
                <p className="text-xs text-muted-foreground/50 mt-1.5">Try a different search term</p>
              </div>
            )}

            {results.map((category, catIdx) => {
              const CatIcon = CATEGORY_ICONS[category.category] || Database;
              const catColor = CATEGORY_COLORS[category.category] || "#64748b";

              return (
                <div key={category.category} data-testid={`search-category-${category.category.toLowerCase().replace(/\s/g, '-')}`}>
                  {catIdx > 0 && <div className="mx-4 border-t border-border/30" />}
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <CatIcon className="h-3 w-3" style={{ color: catColor }} />
                    <span
                      className="text-[10px] font-bold tracking-[0.1em] uppercase"
                      style={{ color: catColor }}
                    >
                      {category.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                      {category.items.length}
                    </span>
                  </div>
                  {category.items.map((item) => {
                    const globalIdx = allItems.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        data-selected={isSelected}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-100"
                        style={{
                          backgroundColor: isSelected ? `${catColor}10` : "transparent",
                        }}
                        data-testid={`search-result-${item.type}-${item.id}`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center transition-colors duration-100"
                          style={{
                            backgroundColor: isSelected ? `${catColor}20` : `${catColor}08`,
                          }}
                        >
                          <CatIcon className="h-3.5 w-3.5" style={{ color: catColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate text-foreground leading-tight">
                            {highlightMatch(item.name, query)}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 leading-tight">
                            {item.subtitle}
                          </p>
                        </div>
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 transition-all duration-100"
                          style={{
                            color: catColor,
                            opacity: isSelected ? 1 : 0,
                            transform: isSelected ? "translateX(0)" : "translateX(-4px)",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {(query.length >= 2 || results.length > 0) && (
            <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 bg-muted/40 rounded text-[10px] border border-border/40 font-mono">↑</kbd>
                  <kbd className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 bg-muted/40 rounded text-[10px] border border-border/40 font-mono">↓</kbd>
                  <span className="ml-0.5">navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 bg-muted/40 rounded text-[10px] border border-border/40 font-mono">↵</kbd>
                  <span className="ml-0.5">open</span>
                </span>
              </div>
              {totalResults > 0 && (
                <span className="text-[11px] text-muted-foreground/50">
                  {totalResults} result{totalResults !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        className="hidden md:flex items-center gap-2 h-8 w-56 px-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg text-muted-foreground hover:border-[#007aff]/40 hover:bg-muted/40 transition-all cursor-pointer"
        onClick={openDialog}
        data-testid="global-search-trigger"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left text-[13px]">Search...</span>
        <kbd className="h-5 px-1.5 text-[10px] font-medium bg-muted/60 border border-border/60 rounded text-muted-foreground/70 flex items-center shrink-0">
          <Command className="h-2.5 w-2.5 mr-0.5" />K
        </kbd>
      </button>
      {overlay}
    </>
  );
}
