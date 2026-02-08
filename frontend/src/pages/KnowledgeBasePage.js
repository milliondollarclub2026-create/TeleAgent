import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FileText,
  Loader2,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingDoc, setAddingDoc] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const addDocument = async () => {
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    setAddingDoc(true);
    try {
      await axios.post(`${API}/documents`, newDoc);
      toast.success('Document added successfully');
      setNewDoc({ title: '', content: '' });
      setDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to add document');
    } finally {
      setAddingDoc(false);
    }
  };

  const deleteDocument = async (docId) => {
    try {
      await axios.delete(`${API}/documents/${docId}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="knowledge-base-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Manrope'] tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Add documents to help your AI understand your business
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-document-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-['Manrope']">Add Document</DialogTitle>
              <DialogDescription>
                Add knowledge that your AI agent can reference during conversations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="docTitle">Document Title</Label>
                <Input
                  id="docTitle"
                  placeholder="e.g., Product Catalog, Pricing Guide, FAQ"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="doc-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docContent">Content</Label>
                <Textarea
                  id="docContent"
                  placeholder="Enter your document content here. Include product details, pricing, policies, FAQs, etc."
                  value={newDoc.content}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                  rows={10}
                  data-testid="doc-content-input"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={addDocument}
                  disabled={addingDoc}
                  data-testid="save-document-btn"
                >
                  {addingDoc && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card className="card-hover">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold font-['Manrope'] mb-2">No Documents Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Add documents like product catalogs, pricing guides, and FAQs to help your AI agent provide accurate information.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="add-first-document-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="card-hover" data-testid={`document-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'Text document'} • 
                        Added {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteDocument(doc.id)}
                    data-testid={`delete-doc-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;
