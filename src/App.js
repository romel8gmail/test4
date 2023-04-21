import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { API, Storage } from "aws-amplify";
import {
    Button,
    Flex,
    Heading,
    Image,
    Text,
    TextField,
    View,
    withAuthenticator,
} from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import {
    createNote as createNoteMutation,
    deleteNote as deleteNoteMutation,
    updateNote as updateNoteMutation,
} from "./graphql/mutations";

const App = ({ signOut }) => {
    const [notes, setNotes] = useState([]);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchNotes();
    }, []);

    async function fetchNotes() {
        const apiData = await API.graphql({ query: listNotes });
        const notesFromAPI = apiData.data.listNotes.items;
        await Promise.all(
            notesFromAPI.map(async (note) => {
                if (note.image) {
                    console.log(`aca 1`);
                    const url = await Storage.get(note.name);
                    console.log(`Image URL 111 for ${note.name}: ${url}`);
                    note.image = url;
                    console.log(`Image URL for ${note.image}: ${url}`);
                }
                return note;
            })
        );
        setNotes(notesFromAPI);
    }

    async function updateNote(id, name, description, price) {
        const updatedNote = {
            id,
            name,
            description,
            price: parseFloat(price),
        };
        await API.graphql({
            query: updateNoteMutation,
            variables: { input: updatedNote },
        });
        fetchNotes();
        setEditingId(null);
    }

    async function createNote(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const image = form.get("image");
        const data = {
            name: form.get("name"),
            description: form.get("description"),
            price: parseFloat(form.get("price")),
            image: image.name,
        };

        if (!!data.image) {
            await Storage.put(data.image, image);
        }
        await API.graphql({
            query: createNoteMutation,
            variables: { input: data },
        });

        fetchNotes();
        event.target.reset();
    }

    async function deleteNote({ id, name }) {
        const newNotes = notes.filter((note) => note.id !== id);
        setNotes(newNotes);
        await Storage.remove(name);
        await API.graphql({
            query: deleteNoteMutation,
            variables: { input: { id } },
        });
    }

    const calculateTotalPrice = () => {
        return notes.reduce((total, note) => total + note.price, 0).toFixed(2);
    };

    return (
        <View className="App">
            <Heading level={1}>My Food App</Heading>
            <View as="form" margin="3rem 0" onSubmit={createNote}>
                <Flex direction="row" justifyContent="center">
                    <TextField
                        name="name"
                        placeholder="Note Name"
                        label="Note Name"
                        labelHidden
                        variation="quiet"
                        required
                    />
                    <TextField
                        name="description"
                        placeholder="Note Description"
                        label="Note Description"
                        labelHidden
                        variation="quiet"
                        required
                    />

                    <TextField
                        name="price"
                        placeholder="Note Price"
                        label="Note Price"
                        labelHidden
                        variation="quiet"
                        type="number"
                        step="0.01"
                        required
                    />
                    <TextField
                        name="image"
                        type="file"
                        label="Note Image"
                        labelHidden
                        variation="quiet"
                    />
                    <Button type="submit">Add Note</Button>
                </Flex>
            </View>
            <Heading level={3}>Total Price: ${calculateTotalPrice()}</Heading>
            <Flex direction="column" gap="1rem">
                {notes.map((note) => (
                    <Flex
                        key={note.id}
                        direction="row"
                        alignItems="center"
                        gap="1rem"
                        justifyContent="space-between"
                    >
                        {editingId === note.id ? (
                            <TextField
                                defaultValue={note.name}
                                onBlur={(e) => updateNote(note.id, e.target.value, note.description, note.price)}
                            />
                        ) : (
                            <Text>{note.name}</Text>
                        )}
                        {editingId === note.id ? (
                            <TextField
                                defaultValue={note.description}
                                onBlur={(e) => updateNote(note.id, note.name, e.target.value, note.price)}
                            />
                        ) : (
                            <Text>{note.description}</Text>
                        )}
                        {editingId === note.id ? (
                            <TextField
                                defaultValue={note.price}
                                type="number"
                                step="0.01"
                                onBlur={(e) => updateNote(note.id, note.name, note.description, e.target.value)}
                            />
                        ) : (
                            <Text>${note.price.toFixed(2)}</Text>
                        )}
                        <Image
                            src={note.image}
                            alt={note.name}
                            width="50"
                            height="50"
                            objectFit="contain"
                        />
                        {editingId === note.id ? (
                            <Button onClick={() => setEditingId(null)}>Cancel</Button>
                        ) : (
                            <Button onClick={() => setEditingId(note.id)}>Edit</Button>
                        )}
                        <Button onClick={() => deleteNote(note)}>Delete</Button>
                    </Flex>
                ))}
            </Flex>
        </View>
    );
};

export default withAuthenticator(App);