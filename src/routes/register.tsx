import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { History, Pause, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
// CONTENT_CONTINUES_FROM_FILE