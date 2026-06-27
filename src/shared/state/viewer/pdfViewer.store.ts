import { create } from 'zustand';

export type PdfViewerDoc = {
  id: string | number;
  name: string;
  file_url: string;
  type?: string;
  created_at?: string;
  storage_path?: string;
};

type PdfViewerStore = {
  viewerDoc: PdfViewerDoc | null;
  openViewer: (doc: PdfViewerDoc) => void;
  closeViewer: () => void;
};

export const usePdfViewerStore = create<PdfViewerStore>((set) => ({
  viewerDoc: null,
  openViewer: (doc) => set({ viewerDoc: doc }),
  closeViewer: () => set({ viewerDoc: null }),
}));

