"use client";

import React, { useState, useEffect } from "react";
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
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ChefHat } from "lucide-react";
import Groq from "groq-sdk";

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  imageUrl: string;
}

export default function Home() {
  const client = new Groq({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
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
    const storageRef = ref(storage, `images/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name && imageFile) {
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

  async function main() {
    const pantryItemsString = items.map((item) => item.name).join(", ");
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: "user", content: `Give me a recipe with included steps based off given pantry: ${pantryItemsString}` },
      ],
      model: "llama3-8b-8192",
    });

    if (chatCompletion.choices[0].message.content) {
      setRecipe(chatCompletion.choices[0].message.content);
    }
    
  }

  return (
    <main>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Pantry Tracker</h1>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search items..."
            className="w-full"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {(searchQuery ? filteredItems : items).map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={500}
                  height={500}
                  className="w-full h-48 object-cover mb-2"
                />
                <p>
                  {item.quantity} {item.unit}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => startEditing(item)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => deleteItem(item.id, item.imageUrl)}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={editingItem.name}
                    onChange={handleEditChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">
                    Quantity
                  </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={editingItem.quantity}
                    onChange={handleEditChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit" className="text-right">
                    Unit
                  </Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={editingItem.unit}
                    onChange={handleEditChange}
                    className="col-span-3"
                  />
                </div>
              </div>
            )}
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Add New Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter item name"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({ ...newItem, quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="Enter unit (e.g., boxes, cans)"
                  value={newItem.unit}
                  onChange={(e) =>
                    setNewItem({ ...newItem, unit: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="image">Image</Label>
                <Input
                  id="image"
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardFooter>
        </Card>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="mt-4" onClick={main}>
              <ChefHat className="w-4 h-4 mr-2" />
              Suggest Recipe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <p>Here is a recipe suggestion based on your pantry items...</p>
            <pre
              className="bg-gray-100 p-4 rounded-md overflow-auto text-sm max-h-96"
              style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
              {recipe}
            </pre>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
