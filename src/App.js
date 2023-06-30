import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { API } from "aws-amplify";
import { 
  Button,
  Flex,
  Heading, 
  Text, 
  TextField, 
  View, 
  withAuthenticator,
  SelectField,
} from "@aws-amplify/ui-react";

import { Auth } from 'aws-amplify';
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [username, setUsername] = useState('');
  const [dueDate, setDueDate] = useState(null);

  useEffect(() => {
    fetchNotes();
    fetchCurrentUser();
  }, []);

  // async function fetchNotes() {
  //   const apiData = await API.graphql({ query: listNotes });
  //   const notesFromAPI = apiData.data.listNotes.items;
  //   setNotes(notesFromAPI);
  // }

  async function fetchNotes() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const username = user.username;
      const apiData = await API.graphql({
        query: listNotes,
        variables: { filter: { username: { eq: username } } }
      });

      const notesFromAPI = apiData.data.listNotes.items;


      const { items } = apiData.data.listNotes;

      // Log the first note's status and dueDate
      console.log("Status:", items[0].status);
      console.log("Due Date:", items[0].dueDate);
      console.log("Response Data:", apiData.data);



      setNotes(notesFromAPI);
    } catch (error) {
      console.log('Error:', error);
    }
  }



  // async function fetchNotes() {
  //   const user = await Auth.currentAuthenticatedUser();
  //   const username = user.username;
  //   const apiData = await API.graphql({ query: listNotes,
  //     variables: { filter: { username: { eq: username } } }
  //   });
  //   const notesFromAPI = apiData.data.listNotes.items;
  
  //   setNotes(notesFromAPI);
  // }
  

  async function fetchCurrentUser() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const email = user.attributes.email;
      const username = user.username;
      setUserEmail(email);
      setUsername(username);
    } catch (error) {
      console.log('Error:', error);
    }
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      username: username,
      status: form.get("status"), // Added status field
      dueDate: form.get("dueDate"), // Added dueDate field
    };

    const status = data.status;
    const dueDate = data.dueDate;
    console.log("Status:", status);
    console.log("Due Date:", dueDate);
    console.log("data send to server",data)


    await API.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    fetchNotes();
    setDueDate(null); // Reset the dueDate sta
    event.target.reset();
  }

  async function deleteNote({ id }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await API.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  Auth.currentAuthenticatedUser()
  .then(user => {
    // Access the user's email from the user object
    const email = user.attributes.email;
    console.log('User email:', email);
    const username = user.username;
    console.log('username',username)
  })
  .catch(error => {
    console.log('Error:', error);
  });

  return (
    <View className="App">
      <Heading level={1}>Task Tracker</Heading>
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
          <SelectField
            name="status"
            label="Status"
            placeholder="Select Status"
            variation="quiet"
            required
          >
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
          </SelectField>
          <DatePicker
            name="dueDate"
            id="dueDate"
            selected={dueDate}
            onChange={(date) => setDueDate(date)}
            required
          />
          <Button type="submit" variation="primary">
            Create Note
          </Button>
        </Flex>
      </View>
      <Heading level={2}>Current Tasks</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex
            key={note.id || note.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {note.name}
            </Text>
            <Text as="span">{note.description}</Text>
            <Text as="span">Status: {note.status}</Text> {/* Display the status field */}
            <Text as="span">Due Date: {note.dueDate}</Text> {/* Display the dueDate field */}
            <Button variation="link" onClick={() => deleteNote(note)}>
              Delete note
            </Button>
            
          </Flex>
        ))}
      </View>
      <Text>User email: {userEmail}</Text>
      <Text>Username: {username}</Text>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);