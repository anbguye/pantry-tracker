"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
  deleteObject,
} from "firebase/storage";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  query,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Trash2, Edit, ChefHat, Upload, Loader2 } from "lucide-react";
import Groq from "groq-sdk";
import { v4 as uuidv4 } from "uuid";

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  imageUrl: string;
}

export default function PantryTracker() {
  const client = new Groq({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<Omit<Item, "id">>({
    name: "",
    quantity: 0,
    unit: "",
    imageUrl: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recipe, setRecipe] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState({
    addItem: false,
    deleteItem: false,
    generateRecipe: false
  });
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    const filtered = items.filter((item) =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleFileUpload = async (file: File) => {
    const storage = getStorage();
    const uniqueImageName = `${uuidv4()}_${file.name}`;
    const storageRef = ref(storage, `images/${uniqueImageName}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const validateItem = (item: Omit<Item, "id">) => {
    if (!item.name.trim()) return "Item name is required";
    if (item.quantity < 0) return "Quantity cannot be negative";
    if (!item.unit.trim()) return "Unit is required";
    return null;
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateItem(newItem);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!newItem.name) {
      setError("Please enter an item name");
      return;
    }
    if (!imageFile) {
      setError("Please select an image");
      return;
    }
    
    setIsLoading(prev => ({ ...prev, addItem: true }));
    try {
      const imageUrl = await handleFileUpload(imageFile);
      await addDoc(collection(db, "items"), {
        ...newItem,
        imageUrl,
      });
      setNewItem({
        name: "",
        quantity: 0,
        unit: "",
        imageUrl: "",
      });
      setImageFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(prev => ({ ...prev, addItem: false }));
    }
  };

  useEffect(() => {
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsArr: Item[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        itemsArr.push({
          id: doc.id,
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          imageUrl: data.imageUrl,
        });
      });
      setItems(itemsArr);
    });

    return () => unsubscribe();
  }, []);

  const deleteItem = async (id: string, imageUrl: string) => {
    await deleteDoc(doc(db, "items", id));
    if (imageUrl) {
      const storage = getStorage();
      const url = new URL(imageUrl);
      const imagePath = decodeURIComponent(url.pathname.split("/o/")[1]);
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
    }
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    setFilteredItems((prevFilteredItems) =>
      prevFilteredItems.filter((item) => item.id !== id)
    );
  };

  const startEditing = (item: Item) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        [e.target.name]:
          e.target.name === "quantity"
            ? Number(e.target.value)
            : e.target.value,
      });
    }
  };

  const saveEdit = async () => {
    if (editingItem) {
      await updateDoc(doc(db, "items", editingItem.id), {
        name: editingItem.name,
        quantity: editingItem.quantity,
        unit: editingItem.unit,
      });
      setEditingItem(null);
      setIsDialogOpen(false);
    }
  };

  async function generateRecipe() {
    const pantryItemsString = items.map((item) => item.name).join(", ");
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Give me a recipe with included steps based off given pantry: ${pantryItemsString}.`,
        },
      ],
      model: "llama3-8b-8192",
    });

    if (chatCompletion.choices[0].message.content) {
      setRecipe(chatCompletion.choices[0].message.content);
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Pantry Tracker</h1>

      <Tabs defaultValue="inventory" className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="add">Add Item</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Pantry Inventory</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  className="pl-8 py-2 text-base"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-6">
                {(searchQuery ? filteredItems : items).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-3 border-b"
                  >
                    <div className="flex items-center space-x-6 flex-grow">
                      <Avatar className="h-16 w-16 flex-shrink-0">
                        <AvatarImage src={item.imageUrl} alt={item.name} />
                        <AvatarFallback className="text-xl">
                          {item.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-grow">
                        <h3 className="text-lg font-medium truncate">
                          {item.name}
                        </h3>
                        <p className="text-base text-muted-foreground">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3 ml-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => startEditing(item)}
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setItemToDelete(item)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Add New Item</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 text-red-500 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              <div className="grid gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="name" className="text-base">
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter item name"
                    className="py-2 text-base"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label htmlFor="quantity" className="text-base">
                      Quantity
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Enter quantity"
                      className="py-2 text-base"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="unit" className="text-base">
                      Unit
                    </Label>
                    <Input
                      id="unit"
                      placeholder="e.g., boxes, cans"
                      className="py-2 text-base"
                      value={newItem.unit}
                      onChange={(e) =>
                        setNewItem({ ...newItem, unit: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image" className="text-base">
                    Image
                  </Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="image"
                      type="file"
                      className="sr-only"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImageFile(e.target.files[0]);
                        }
                      }}
                    />
                    <Label htmlFor="image" className="cursor-pointer">
                      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                    </Label>
                    <span className="text-base text-muted-foreground">
                      Upload item image
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full py-2 text-base" 
                onClick={addItem} 
                disabled={isLoading.addItem}
              >
                {isLoading.addItem ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...
                  </span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-1">
                <Label htmlFor="edit-name" className="text-base">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editingItem.name}
                  onChange={handleEditChange}
                  className="py-2 text-base"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="edit-quantity" className="text-base">
                  Quantity
                </Label>
                <Input
                  id="edit-quantity"
                  name="quantity"
                  type="number"
                  value={editingItem.quantity}
                  onChange={handleEditChange}
                  className="py-2 text-base"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="edit-unit" className="text-base">
                  Unit
                </Label>
                <Input
                  id="edit-unit"
                  name="unit"
                  value={editingItem.unit}
                  onChange={handleEditChange}
                  className="py-2 text-base"
                />
              </div>
            </div>
          )}
          <Button onClick={saveEdit} className="w-full py-2 text-base">
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {itemToDelete?.name}?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setItemToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (itemToDelete) {
                  deleteItem(itemToDelete.id, itemToDelete.imageUrl);
                  setItemToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            className="w-full py-2 text-base mt-4"
            onClick={generateRecipe}
          >
            <ChefHat className="w-4 h-4 mr-2" /> Suggest Recipe
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Recipe Suggestion</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <p className="text-lg whitespace-pre-wrap">{recipe}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
