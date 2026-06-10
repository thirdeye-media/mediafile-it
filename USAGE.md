# MediaFile_it - Annotator User Manual & App Documentation

Welcome to **MediaFile_it**, an AI-assisted film cataloging and annotation studio. This document serves as the primary manual for annotators using the app, and provides context to the AI Assistant so it can help answer user questions about app functionality.

## 1. Starting a Session
* **Identity Check**: When you first open the app, you will be prompted with **"Who are you?"** (or "Who is the annotator?").
* **Filtering**: Entering your exact annotator name (as assigned in the database) filters the **Film Queue** on the left to show only the films assigned to you.
* **Goal Progress**: A progress bar tracks your completion based on the films assigned to you.

## 2. Interacting with the Chat
The AI Assistant panel on the left is your co-pilot for drafting metadata. Instead of just manually typing into blank forms, you can converse with the AI, and it populates the forms for you.
* **What the Chat Knows:** The AI is provided with the current film's basic information (Title, Date, Place, Author, Vimeo URL), the state of your form fields, and strict *Annotation Guidelines*.
* **What the Chat Doesn't Know:** The AI **cannot watch the video**. It relies entirely on your observations, notes, and the context you provide it.
* **How to interact:** As you watch the film via the provided Vimeo link, drop your thoughts, keywords, and observations directly into the chat. 
* **Using `@Mentions`:** If you want to explicitly target a field, click the `@` icon next to any field title on the right. This pastes a tag (like `@Description`) into the chat so you can be explicit: *"@Description The film features a long tracking shot..."*

## 3. Filling in the Forms & Approvals
The right side of the screen is the **Annotation Studio**.
* **Auto-fill:** As you chat, the AI will automatically draft and update content into these fields.
* **Manual edit:** You can always click into any field (like *Historic Context* or *Aesthetic-Critical Commentary*) and manually type or edit the text.
* **The Approval Process:** You will notice that every field starts as **"Needs Approval"** (or an unapproved state). While the AI can draft text, **the AI CANNOT approve it**.
* **The Value of Approval:** Approval acts as your signature. It tells the system "I have reviewed this text, it is accurate, and it meets the guidelines." A film is considered complete only once all assigned fields are both filled *and* manually clicked "Approve" by you.

## 4. Saving Progress, Backups, and Merging CSVs (Crucial!)
**Your work is saved locally in your browser's local cache.** 
* **Risk of Data Loss:** If you clear your browser cache, use "Incognito/Private" mode, or switch to a different browser/computer, **you will not see your previous work**.
* **Restoring Data & Merging:** If you switch computers or lose your cache, use the **Upload** button to upload a `.csv` file. 
* **Upload Resolution Rules:** 
  1. The app will never erase or overwrite your existing local work. 
  2. If you upload a CSV, the app compares its contents to your local cache.
  3. If your local cache already has edits for a field, the local edits are always preserved over the CSV data.
  4. If your local cache is empty for a field, the app will fill it with the incoming data from the uploaded CSV.

## 5. Exporting the Final Deliverable
Your ultimate goal is to reach 100% completion in your Goal Progress bar.
1. Click the **Export DB** (or Download) button in the side menu.
2. A `.csv` file will be downloaded to your computer.
3. **Delivery:** Attach this `.csv` file to an email and send it to your lead administrator or project coordinator.

## 6. Report Generation
* Beside the CSV tools, there is a "Report" functionality. Clicking it triggers the AI to evaluate the quality, depth, and insights of your current session based on the chat history.

## 7. Multilingual Support
* Use the Globe icon to toggle the UI between English and Spanish. The AI understands both regardless of the UI setting.
